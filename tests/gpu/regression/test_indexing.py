import torch
from torch.testing._internal.common_utils import TestCase
import intel_extension_for_pytorch  # noqa F401

cpu_device = torch.device("cpu")


def double_step_seq(step1, len1, step2, len2):
    seq1 = torch.arange(0, step1 * len1, step1)
    seq2 = torch.arange(0, step2 * len2, step2)
    return (seq1[:, None] + seq2[None, :]).reshape(1, -1)


class TestTorchMethod(TestCase):
    def test_index_fill(self, dtype=torch.float):
        x = torch.randn((8192, 8192), device=cpu_device)
        index = torch.linspace(0, 8190, steps=4096, device=cpu_device).to(torch.long)
        y = x.index_fill(0, index, 0)

        x_xpu = x.xpu()
        index = index.xpu()
        y_xpu = x_xpu.index_fill(0, index, 0)
        self.assertEqual(y, y_xpu.cpu())

    def test_index_copy(self, dtype=torch.float):
        x = torch.randn((8192, 8192), device=cpu_device)
        t = torch.randn((4096, 8192), dtype=torch.float)
        index = torch.linspace(0, 8190, steps=4096, device=cpu_device).to(torch.long)
        y = x.index_copy(0, index, t)

        x_xpu = x.xpu()
        t = t.xpu()
        index = index.xpu()
        y_xpu = x_xpu.index_copy(0, index, t)
        self.assertEqual(y, y_xpu.cpu())

    def test_index_add(self, dtype=torch.float):
        x = torch.randn((8192, 8192), device=cpu_device)
        t = torch.randn((4096, 8192), dtype=torch.float)
        index = torch.linspace(0, 8190, steps=4096, device=cpu_device).to(torch.long)
        y = x.index_add(0, index, t)

        x_xpu = x.xpu()
        t = t.xpu()
        index = index.xpu()
        y_xpu = x_xpu.index_add(0, index, t)
        self.assertEqual(y, y_xpu.cpu())

    def test_index_2_dim(self, dtype=torch.float):
        table = torch.randn([169, 16])
        table_xpu = table.to("xpu")
        rel_index_coords = double_step_seq(13, 7, 1, 7)
        rel_position_index = rel_index_coords + rel_index_coords.T
        rel_position_index = rel_position_index.flip(1).contiguous()

        out_cpu = table[rel_position_index.view(-1)]
        out_xpu = table_xpu[rel_position_index.view(-1)]
        self.assertEqual(out_cpu, out_xpu.cpu())

    def test_index_small_shape(self, dtype=torch.float):
        vertices_cpu = torch.randn([16367, 1, 3])
        vertices_xpu = vertices_cpu.to("xpu")

        vert_filter_cpu_rand = torch.rand([16367]) < 0.8
        vert_filter_xpu_rand = vert_filter_cpu_rand.to("xpu")

        result_cpu = vertices_cpu[vert_filter_cpu_rand]
        result_xpu = vertices_xpu[vert_filter_xpu_rand]
        self.assertEqual(result_cpu, result_xpu.cpu())

    def test_index_int32(self):
        probs = torch.ones((256, 50272), dtype=torch.float32)
        indice = torch.range(0, 255, dtype=torch.int32)

        out_cpu = probs[indice]
        out_xpu = probs.xpu()[indice.xpu()]

        self.assertEqual(out_xpu.to("cpu"), out_cpu)
